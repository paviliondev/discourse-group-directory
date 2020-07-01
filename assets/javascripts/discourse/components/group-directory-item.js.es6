import { default as discourseComputed, observes, on } from "discourse-common/utils/decorators";
import Composer from 'discourse/models/composer';
import { default as DiscourseURL, userPath } from "discourse/lib/url";
import Component from "@ember/component";
import { getOwner } from 'discourse-common/lib/get-owner';

const minimizedMap = [210,229,256,287];

const nameUsernameDiff = function(user) {
  return user.name.replace(/[\-\_ \.]/g, "").toLowerCase() != user.username.replace(/[\-\_ \.]/g, "").toLowerCase();
}

const bioLength = function(user) {
  return user.bio_cooked.replace(/<a\b[^>]*>(.*?)<\/a>/i,"").length
}

export default Component.extend({
  tagName: 'tr',
  attributeBindings: ['style'],
  
  @discourseComputed('hasHighlightBadge', 'minimized', 'minimizedHeight')
  style(hasHighlightBadge, minimized, minimizedHeight) {
    let style = '';
        
    if (hasHighlightBadge) {
      const color = this.siteSettings.rstudio_highlight_color;
      style += `background-color: ${color};`.htmlSafe();
    }
    
    if (minimized && minimizedHeight) {
      style += `height: ${minimizedHeight}`;
    } else {
      style += `height: 100%`;
    }
    
    return style;
  },
  
  didInsertElement() {
    this.handleShorten();
  },
  
  click(args) {
    DiscourseURL.routeTo(userPath(this.user));
  },
  
  handleShorten() {
    const user = this.user;
    
    if (user.bio_cooked) {
      if (bioLength(user) > 538) {
        let fields = 0;
        
        ['name', 'company', 'location'].forEach(attr => {
          if (user[attr]) {
            fields += 1;
          }
        });
        
        this.set('minimizedHeight', minimizedMap[fields])
      }
    }
  },
  
  @discourseComputed('consultantBadges')
  displayBadges(consultantBadges) {
    return (consultantBadges || []).filter(b => this.userHasBadge(b));
  },
  
  userHasBadge(badge) {
    const user = this.user;
    return user.user_badges && user.user_badges.any(b => b.badge_id == badge.id);
  },
  
  @discourseComputed('user', 'consultantBadges')
  hasHighlightBadge(user, consultantBadges) {
    const highlightBadge = consultantBadges.find(b => b.name == this.siteSettings.rstudio_highlight_badge);
    if (!user.user_badges || !highlightBadge) return false;
    return user.user_badges.any(b => b.badge_id == highlightBadge.id);
  },
  
  actions: {
    expandBio() {
      this.set('minimized', false);
    },
    
    collapseBio() {
      this.set('minimized', true);
    },
    
    sendMessage() {
      if (this.currentUser) {
        getOwner(this).lookup('controller:composer').open({
          action: Composer.PRIVATE_MESSAGE,
          usernames: this.user.username,
          archetypeId: 'private_message',
          draftKey: 'new_private_message'
        });
      } else {
        this.application.send("showLogin");
      }
    }
  }
})