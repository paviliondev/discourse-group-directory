import { withPluginApi } from "discourse/lib/plugin-api";

function initializeConsultants(api) {
  api.modifyClass('route:group-index', {      
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
