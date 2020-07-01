# name: discourse-group-directory
# about: Discourse group directory plugin
# version: 0.2
# author: Pavilion
# license: https://github.com/paviliondev/discourse-group-directory
# url: https://github.com/paviliondev/discourse-group-directory.git

enabled_site_setting :group_directory_enabled

register_asset 'stylesheets/rstudio-consultants-theme.scss'

after_initialize do
  add_to_serializer(:group_user, :bio_cooked) { object.user_profile.bio_processed }
  add_to_serializer(:group_user, :location) { object.user_profile.location }
  add_to_serializer(:group_user, :user_badges) { object.user_badges }

  add_to_serializer(:group_user, :company) do
    object.user_fields[company_field.id.to_s]
  end
  
  add_to_serializer(:group_user, :include_company?) do
     SiteSetting.rstudio_company_field.present? &&
     company_field.present?
  end
  
  add_to_serializer(:group_user, :company_field) do 
    UserField.find_by_name(SiteSetting.rstudio_company_field)
  end
  
  add_to_serializer(:group_user, :include_company_field?) { false }

  add_to_serializer(:group_user, :consultant_var_01) do
    sorted_field_id = consultant_var_01_field.id
    c_var = object.user_fields[sorted_field_id.to_s]

    # handle null values for sorting
    if c_var.nil?
      c_var = "0"
    end

    # A hack for allowing values like .9
    if c_var[0] == "."
      "0" + c_var
    else
      c_var
    end
  end
  
  add_to_serializer(:group_user, :include_consultant_var_01?) do
    SiteSetting.rstudio_consultant_var_01_field.present? &&
    consultant_var_01_field.present?
  end
  
  add_to_serializer(:group_user, :consultant_var_01_field) do
    UserField.find_by_name(SiteSetting.rstudio_consultant_var_01_field)
  end
  
  add_to_serializer(:group_user, :include_consultant_var_01_field?) { false }

  add_to_serializer(:group_user, :consult_language) do
    language_field_id = language_field.id
    object.user_fields[language_field_id.to_s]
  end
  
  add_to_serializer(:group_user, :include_consult_language?) do
    SiteSetting.rstudio_language_field.present? &&
    language_field.present?
  end
  
  add_to_serializer(:group_user, :language_field) do
    UserField.find_by_name(SiteSetting.rstudio_language_field)
  end
  
  add_to_serializer(:group_user, :include_language_field?) { false }
end
