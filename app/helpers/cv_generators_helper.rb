# frozen_string_literal: true

module CvGeneratorsHelper
  def sample_json
    {
      "name" => "",
      "current_role" => "",
      "projects" => [
        {
          "id" => "project_1",
          "title" => "Project 1",
          "rows" => [
            {
              "title" => "Project name",
              "description" => "Project name..."
            },
            {
              "title" => "Overview",
              "description" => "Project overview..."
            },
            {
              "title" => "Technologies",
              "description" => "Technologies used..."
            },
            {
              "title" => "Role",
              "description" => "Your role in the project..."
            },
            {
              "title" => "Common tasks",
              "description" => "• Task 1\n• Task 2\n• Task 3"
            },
            {
              "title" => "Duration",
              "description" => "Project duration..."
            }
          ]
        }
      ],
      "languages" => [
        {
          "title" => "Language",
          "level" => "Level"
        }
      ],
      "skills_qualifications" => [
        {
          "title" => "Skills Category",
          "description" => "List of skills..."
        }
      ]
    }.to_json
  end
end
