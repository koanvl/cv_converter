class SyncHtmlWithContent < ActiveRecord::Migration[7.2]
  def up
    Example.find_each do |example|
      example.update_column(:html, example.content)
    end
  end

  def down
    # No need for rollback as this is a data fix
  end
end
