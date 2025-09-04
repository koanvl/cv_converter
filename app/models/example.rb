# frozen_string_literal: true

class Example < ApplicationRecord
  validates :title, presence: true
  validates :format, inclusion: { in: %w[default modern classic] }

  before_save :generate_html

  private

  def generate_html
    # В будущем здесь будет генерация HTML из content
    self.html ||= content
  end
end
