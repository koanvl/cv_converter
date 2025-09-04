# frozen_string_literal: true

class Example < ApplicationRecord
  validates :title, presence: true
  validates :format, inclusion: { in: %w[default modern classic] }

  before_save :sync_html_with_content

  private

  def sync_html_with_content
    # Always sync HTML with content
    self.html = content if content_changed?
  end
end
