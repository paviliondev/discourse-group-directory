import GroupIndexController from "discourse/controllers/group-index";
import { default as computed, observes, on } from "discourse-common/utils/decorators";
import User from 'discourse/models/user';
import Composer from 'discourse/models/composer';
import UserBadge from 'discourse/models/user-badge';
import BadgeGrouping from 'discourse/models/badge-grouping';
import Badge from 'discourse/models/badge';
import { ajax } from 'discourse/lib/ajax';
import { scheduleOnce } from "@ember/runloop";
import { sort, equal } from "@ember/object/computed";
import EmberObject from "@ember/object";

export default GroupIndexController.extend({
  sortProperties: [Discourse.SiteSettings.rstudio_consultant_var_01_field + ':desc'],
  sortedMembers: sort('model.members', 'sortProperties'),
  isConsultantsPage: equal('model.name', 'consultants'),
  
  @computed("order", "desc", "filter")
  memberParams(order, desc, filter) {
    return { order, desc, filter };
  },
  
  searchMembers(isFirst) {
    this.set("loading", true);
    const c_model = this.get("memberCache");
    const filter = this.get("filter");
    
    if (c_model) {
      var users = c_model.filter((user) => {
        return !filter || ['username', 'company', 'consult_language', 'bio_cooked', 'location'].any(attr => {
          return item[attr] && item[attr].toLowerCase().includes(filter.toLowerCase());
        })
      });
      
      this.set("model.members", users);
      
      if (isFirst != true && users) {
        users.forEach(function(user) {
          if (item.should_highlight) {
            scheduleOnce('afterRender', () => {
              $(".consultant-" + item.username + "-row").css("background-color", Discourse.SiteSettings.rstudio_highlight_color);
            });
          }
          if (item.bioShortenLevel) {
            scheduleOnce('afterRender', () => {
              $("." + item.username + "-bio").css("height", item.bioShortenLevel);
              $("." + item.username + "-bio-buttons > .bio-expand").css("display", "block");
            });
          }
        });
      }
    }
    
    this.set("loading", false);
  },
  
  // TO DO: refactor this
  findConsultants() {
    if (!this.currentUser || (this.currentUser && !this.currentUser.admin)) {
      scheduleOnce('afterRender', this, function() {
        $(`.user-content-wrapper`).addClass("non-admin");
      });
    }
    
    this.set("loading", true);
    let consultantGrouping;
    const model = this.get("model");
    
    if (model) {
      ajax("/badges.json").then((result) => {
        
        var consultantBadgeGrouping = null;
        if ("badge_groupings" in result) {
          result.badge_groupings.forEach(function(badgeGroupingJson) {
            if (badgeGroupingJson.name == "Consultants") {
              consultantBadgeGrouping = BadgeGrouping.create(badgeGroupingJson);
            }
          });
        }

        if (consultantBadgeGrouping) {
          this.set('consultantGrouping', consultantBadgeGrouping);

          const badgeTypes = {};
          if ("badge_types" in result) {
            result.badge_types.forEach(function(badgeTypeJson) {
              badgeTypes[badgeTypeJson.id] = EmberObject.create(badgeTypeJson);
            });
          }

          let badges = [];
          if ("badge" in result) {
            badges = [result.badge];
          } else if (result.badges) {
            badges = result.badges;
          }

          var badgesObj = {};
          badges.forEach(function(badgeJson) {
            if (badgeJson.badge_grouping_id == consultantBadgeGrouping.id) {
              const badge = Badge.create(badgeJson);
              badge.set("badge_type", badgeTypes[badge.get("badge_type_id")]);
              badge.set("badge_grouping", consultantBadgeGrouping);
              badgesObj[badgeJson.id] = badge;
            }
          });
          this.set('rwBadges', badgesObj);
        }
        
        model.findMembers(this.get("memberParams")).finally(() => {
          ['members', 'owners'].forEach(k => {
            if (model[k] === null || model[k] === undefined)
              model.set(k, 0);
          });
          this.set(
            "application.showFooter",
            model.members.length >= model.user_count - model.owners.length
          );
          this.set("loading", false);
          this.set("memberCache", model.members);
          const badges = this.get("rwBadges");
          const member_count = model.members.length;
          var highlight_list = [];
          var shorten_list = [];

          for (var i = 0; i < member_count; i++) {
            var item = model.members[i];
            var badges_result = [];

            if (item.username) {
              if (item.user_badges && badges) {
                for (var j = 0; j < item.user_badges.length; j++) {
                  var user_badge = item.user_badges[j]
                  var badge = badges[user_badge.badge_id]
                  if (badge) {
                    item.user_badges[j].badge = badge
                    if (badge.name == Discourse.SiteSettings.rstudio_highlight_badge) {
                        highlight_list.push(item.username);
                        item.set("should_highlight", true);
                    }
                    badges_result.push(user_badge);
                  }
                }
              }

              item.set('badges', badges_result);

              if (item.bio_cooked) {
                // Remove links from the bio
                item.bio_cooked = item.bio_cooked.replace(/<a\b[^>]*>(.*?)<\/a>/i,"");

                if (item.bio_cooked.length > 538) {
                  //set height
                  var fields = 0;
                  if (item.name && item.name.replace(/[\-\_ \.]/g, "").toLowerCase() != item.username.replace(/[\-\_ \.]/g, "").toLowerCase()) {
                    fields = fields + 1;
                  }
                  if (item.company) {
                    fields = fields + 1;
                  }
                  if (item.location) {
                    fields = fields + 1;
                  }

                  if (fields == 3) {
                    shorten_list.push({
                      username: item.username,
                      shortenLevel: "287px"
                    });
                    item.set('bioShortenLevel', "287px");
                  } else if (fields == 2) {
                    shorten_list.push({
                      username: item.username,
                      shortenLevel: "256px"
                    });
                    item.set('bioShortenLevel', "256px");
                  } else if (fields == 1) {
                    shorten_list.push({
                      username: item.username,
                      shortenLevel: "229px"
                    });
                    item.set('bioShortenLevel', "229px");
                  } else if (fields == 0) {
                    shorten_list.push({
                      username: item.username,
                      shortenLevel: "210px"
                    });
                    item.set('bioShortenLevel', "210px");
                  }
                }
              }
            }
          }
          
          this.findMembers(true);
          
          scheduleOnce('afterRender', this, function() {
            highlight_list.forEach(function(user) {
              $(`.consultant-${user}-row`).css(
                "background-color",
                Discourse.SiteSettings.rstudio_highlight_color
              );
            });
            shorten_list.forEach(function(user){
              $(`.${user.username}-bio`).css("height", user.shortenLevel);
              $(`.${user.username}-bio-buttons > .bio-expand`).css("display", "block");
            });
          });
        });
      });
    }
  },
  
  @observes("order", "asc", "filter")
  _filtersChanged() {
    this.findConsultants();
  },
  
  actions: {
    sendMessage(args) {
      if (args.username && this.currentUser) {
        getOwner(this).lookup('controller:composer').open({
          action: Composer.PRIVATE_MESSAGE,
          usernames: args.username,
          archetypeId: 'private_message',
          draftKey: 'new_private_message'
        });
      } else {
        this.application.send("showLogin");
      }
    },
    
    expandBio(args) {
      $("." + args.username + "-bio").css("height", "100%");
      $("." + args.username + "-bio-buttons > .bio-expand").css("display", "none");
      $("." + args.username + "-bio-buttons > .bio-collapse").css("display", "block");
    },
    
    collapseBio(args) {
      var fields = 0;
      if (args.bioShortenLevel) {
        $("." + args.username + "-bio").css("height", args.bioShortenLevel);
      }
      $("." + args.username + "-bio-buttons > .bio-collapse").css("display", "none");
      $("." + args.username + "-bio-buttons > .bio-expand").css("display", "block");
    },
    
    consultantClick(args) {
      this.transitionToRoute("user", args);
    }
  }
});