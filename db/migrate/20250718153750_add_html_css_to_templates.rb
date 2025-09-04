class AddHtmlCssToTemplates < ActiveRecord::Migration[7.2]
  def change
    add_column :templates, :html, :text
    add_column :templates, :css, :text
  end
end
