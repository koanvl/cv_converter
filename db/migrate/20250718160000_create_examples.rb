class CreateExamples < ActiveRecord::Migration[7.2]
  def change
    create_table :examples do |t|
      t.string :title, null: false
      t.text :content
      t.text :html
      t.text :css
      t.string :format, default: 'default'
      t.boolean :published, default: false

      t.timestamps
    end

    add_index :examples, :title
    add_index :examples, :published
  end
end
