import { withPluginApi } from "discourse/lib/plugin-api";
import UserBadge from 'discourse/models/user-badge';
import BadgeGrouping from 'discourse/models/badge-grouping';
import Badge from 'discourse/models/badge';

function initializeConsultants(api) {
  api.modifyClass('route:group-index', {
    afterModel(model) {
      if (model && model.name == 'consultants') {
        return Badge.findAll().then(function(result) {
          model.set('consultantBadges', result.filter(b => b.badge_grouping.name == "Consultants"));
        })
      } else {
        return this._super(model);
      }
    },
        
    setupController(controller, model) {
      if (model.name == 'consultants') {
        this.controllerFor("group").set("showing", "members");
        const consultantsController = this.controllerFor('consultants-index');
        consultantsController.setProperties({
          model,
          filterInput: this._params.filter
        });
        consultantsController.findConsultants();
      } else {
        this._super(controller, model);
      } 
    },
    
    renderTemplate(controller, model) {
      if (model && model.name == 'consultants') {
        this.render('consultants-index');
      } else {
        this._super(controller, model);
      }
    }
  });
}

export default {
  name: "consultants-initializer",

  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");
    if (siteSettings.group_directory_enabled) {
      withPluginApi("0.8.24", initializeConsultants);
    }
  }
};
