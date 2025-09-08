class CvCandidate < ApplicationRecord
  validates :name, presence: { message: "can't be blank" }
  validates :structured_data, presence: { message: "must contain valid JSON data" }

  has_many :cv_generations, dependent: :destroy

  def parsed_structured_data
    return {} if structured_data.nil?
    return structured_data if structured_data.is_a?(Hash)

    JSON.parse(structured_data)
  rescue JSON::ParserError
    {}
  end

  def projects
    parsed_structured_data["projects"] || []
  end

  def skills_qualifications
    parsed_structured_data["skills_qualifications"] || []
  end

  def languages
    parsed_structured_data["languages"] || []
  end

  def current_role
    parsed_structured_data["current_role"]
  end
end
