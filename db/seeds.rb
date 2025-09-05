# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# Создаем пример шаблона резюме
example_template = Example.find_or_create_by!(title: "Базовый шаблон резюме") do |template|
  template.format = "modern"
  template.published = true
  template.content = <<~HTML
    <h1>{{name}}</h1>
    <h2>{{current_role}}</h2>

    <h3>Навыки и квалификация</h3>
    <table class="custom-grid-table">
      {{#each skills_qualifications}}
      <tr>
        <td><strong>{{title}}:</strong></td>
        <td>{{description}}</td>
      </tr>
      {{/each}}
    </table>

    <h3>Проекты</h3>
    {{#each projects}}
    <h4>{{title}}</h4>
    <table class="custom-grid-table">
      <tr>
        <td><strong>Название проекта:</strong></td>
        <td>{{project_name}}</td>
      </tr>
      <tr>
        <td><strong>Обзор:</strong></td>
        <td>{{overview}}</td>
      </tr>
      <tr>
        <td><strong>Технологии:</strong></td>
        <td>{{technologies}}</td>
      </tr>
      <tr>
        <td><strong>Роль:</strong></td>
        <td>{{role}}</td>
      </tr>
      <tr>
        <td><strong>Длительность:</strong></td>
        <td>{{duration}}</td>
      </tr>
    </table>
    {{/each}}

    <h3>Языки</h3>
    {{#each languages}}
    <p><strong>{{title}}:</strong> {{level}}</p>
    {{/each}}
  HTML

  template.css = <<~CSS
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    h1 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }

    h2 {
      color: #34495e;
      margin-top: 0;
    }

    h3 {
      color: #2c3e50;
      margin-top: 30px;
      margin-bottom: 15px;
    }

    h4 {
      color: #34495e;
      margin-top: 25px;
      margin-bottom: 10px;
    }

    table.custom-grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    table.custom-grid-table td {
      border: 1px solid #ddd;
      padding: 10px;
      vertical-align: top;
    }

    table.custom-grid-table td:first-child {
      background-color: #f8f9fa;
      font-weight: bold;
      width: 200px;
    }

    .cv-variable {
      background-color: transparent;
      border: none;
      padding: 0;
      color: inherit;
    }
  CSS
end

# Создаем тестового кандидата
sample_candidate = CvCandidate.find_or_create_by!(name: "Ivan B.") do |candidate|
  candidate.original_resume = "Experienced Python developer with 5+ years of experience..."
  candidate.structured_data = {
    "name" => "Ivan B.",
    "current_role" => "Python developer",
    "projects" => [
      {
        "id" => "project_1",
        "title" => "Project 1",
        "project_name" => "NDA",
        "overview" => "Developed API interfaces using FastAPI framework, wrote tests for the APIs, and created CI CD pipelines. Collaborated with ML engineers to optimize the ML infrastructure.",
        "technologies" => "FastAPI, Docker, Kubernetes, Bash",
        "role" => "Python Software Developer",
        "common_tasks" => "• Develop API interfaces\n• Write tests for APIs\n• Create CI CD pipelines\n• Manage containerized applications with Docker and Kubernetes\n• Write Bash scripts for automation\n• Collaborate with ML engineers",
        "duration" => "9 months"
      },
      {
        "id" => "project_2",
        "title" => "Project 2",
        "project_name" => "NDA",
        "overview" => "Responsible for developing backend applications with REST API interfaces using FastAPI and Django, creating websites using Django templates and JavaScript, and deploying applications on AWS.",
        "technologies" => "FastAPI, Django, JavaScript, AWS, Redis, RabbitMQ, Celery, Postgres, Cassandra, Docker, Linux",
        "role" => "Python Software Developer",
        "common_tasks" => "• Develop backend applications\n• Create REST API interfaces\n• Integrate APIs with other services\n• Deploy applications on AWS\n• Collaborate with other developers",
        "duration" => "5 years"
      }
    ],
    "languages" => [
      {
        "title" => "English",
        "level" => "Upper-Intermediate"
      }
    ],
    "skills_qualifications" => [
      {
        "title" => "Programming Languages",
        "description" => "Python, JavaScript"
      },
      {
        "title" => "Backend Frameworks",
        "description" => "Django, FastAPI"
      },
      {
        "title" => "Cloud Services",
        "description" => "AWS"
      }
    ]
  }
end

puts "✅ Созданы тестовые данные:"
puts "  - Шаблон: #{example_template.title}"
puts "  - Кандидат: #{sample_candidate.name}"
