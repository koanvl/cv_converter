class CreateCvGenerations < ActiveRecord::Migration[7.2]
  def change
    create_table :cv_generations do |t|
      t.references :example, null: false, foreign_key: true
      t.references :cv_candidate, null: false, foreign_key: true
      t.text :generated_html
      t.text :generated_css

      t.timestamps
    end
  end
end
