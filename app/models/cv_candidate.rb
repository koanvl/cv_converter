class CvCandidate < ApplicationRecord
  validates :name, presence: { message: "can't be blank" }
  validates :structured_data, presence: { message: "must contain valid JSON data" }

  has_many :cv_generations, dependent: :destroy

  def projects
    structured_data&.dig("projects") || []
  end

  def skills_qualifications
    structured_data&.dig("skills_qualifications") || []
  end

  def languages
    structured_data&.dig("languages") || []
  end

  def current_role
    structured_data&.dig("current_role")
  end
end
