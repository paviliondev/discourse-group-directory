import { default as discourseComputed, observes, on } from "discourse-common/utils/decorators";
import Composer from 'discourse/models/composer';
import { default as DiscourseURL, userPath } from "discourse/lib/url";
import Component from "@ember/component";
import { getOwner } from 'discourse-common/lib/get-owner';
import { equal } from "@ember/object/computed";

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
  bioExpanded: equal('bioHeight', '100%'),
  collapsedBioHeight: null,
  
  @discourseComputed('hasHighlightBadge')
  style(hasHighlightBadge) {
    let style = '';
        
    if (hasHighlightBadge) {
      const color = this.siteSettings.rstudio_highlight_color;
      style += `background-color: ${color};`.htmlSafe();
    }
    
    return style;
  },
  
  didInsertElement() {
    this.setCollapsedBioHeight();
  },
  
  click(args) {
    DiscourseURL.routeTo(userPath(this.user));
  },

  setCollapsedBioHeight() {
    const user = this.user;
    let collapsedBioHeight;
        
    if (user.bio_cooked && bioLength(user) > 538) {
      let fields = 0;
      
      ['name', 'company', 'location'].forEach(attr => {
        if (user[attr]) {
          fields += 1;
        }
      });
      
      collapsedBioHeight = minimizedMap[fields];
      this.set('collapsedBioHeight', collapsedBioHeight);
    }
    
    this.set('bioHeight', `${collapsedBioHeight}px` || '100%');
  },
  
  @discourseComputed('bioHeight')
  bioHeightStyle(bioHeight) {
    return bioHeight || '100%';
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
      this.set('bioHeight', '100%');
    },
    
    collapseBio() {
      if (this.collapsedBioHeight) {
        this.set('bioHeight', `${this.collapsedBioHeight}px`);
      }
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