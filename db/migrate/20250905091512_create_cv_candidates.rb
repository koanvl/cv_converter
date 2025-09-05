class CreateCvCandidates < ActiveRecord::Migration[7.2]
  def change
    create_table :cv_candidates do |t|
      t.string :name
      t.text :original_resume
      t.json :structured_data

      t.timestamps
    end
  end
end
