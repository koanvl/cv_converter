# frozen_string_literal: true

class Template < ApplicationRecord
  validates :title, presence: true
end
