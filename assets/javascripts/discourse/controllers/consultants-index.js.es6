import GroupIndexController from "discourse/controllers/group-index";
import { default as computed, observes, on } from "discourse-common/utils/decorators";
import User from 'discourse/models/user';
import { scheduleOnce } from "@ember/runloop";
import { sort, equal } from "@ember/object/computed";
import EmberObject from "@ember/object";
import discourseDebounce from "discourse/lib/debounce";
import { INPUT_DELAY } from "discourse-common/config/environment";

const filterableFields = ['name', 'username', 'company', 'consult_language', 'bio_cooked', 'location'];

export default GroupIndexController.extend({
  sortedMembers: sort('model.members', 'sortProperties'),
  isConsultantsPage: equal('model.name', 'consultants'),
  
  @computed
  sortProperties() {
    return [this.siteSettings.rstudio_consultant_var_01_field + ':desc']
  },

  @computed("order", "desc", "filter")
  memberParams(order, desc, filter) {
    return { order, desc, filter };
  },
  
  @observes('filter')
  filterMembers: discourseDebounce(function() {
    this.set("loading", true);
    const memberCache = this.get("memberCache");
    const filter = this.get("filter");

    if (memberCache) {
      let users = memberCache.filter((user) => {
        return !filter || filterableFields.any(attr => {
          return user[attr] && user[attr].toLowerCase().includes(filter.toLowerCase());
        })
      });
      
      this.set("model.members", users);
    }
    
    this.set("loading", false);
  }, INPUT_DELAY),
  
  findConsultants() {
    if (!this.currentUser || (this.currentUser && !this.currentUser.admin)) {
      scheduleOnce('afterRender', this, function() {
        $(`.user-content-wrapper`).addClass("non-admin");
      });
    }
    
    this.set("loading", true);
    const model = this.get("model");                

    this.model.reloadMembers(this.memberParams, true).then(() => {
      ['members', 'owners'].forEach(k => {
        if (model[k] === null || model[k] === undefined) {
          model.set(k, 0);
        }
      });
      this.set("application.showFooter", model.members.length >= model.user_count - model.owners.length);
      this.set("loading", false);
      this.set("memberCache", model.members);
    });
  }
});