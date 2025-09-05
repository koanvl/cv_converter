Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/*
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest

  # Defines the root path route ("/")
  root "templates#index"

  resources :templates, only: [ :index, :show, :new, :create, :edit, :update, :destroy ]

  resources :examples do
    member do
      get "download", defaults: { format: "docx" }
    end
  end

  # CV Generator routes
  resources :cv_generators, path: "cv-generator" do
    member do
      post "generate/:example_id", to: "cv_generators#generate", as: "generate_with_template"
    end
  end

  # CV Generation editing routes
  resources :cv_generations, path: "cv-generation", only: [ :show, :edit, :update ] do
    member do
      get "edit_content", to: "cv_generations#edit_content"
    end
  end

  post "/assets/upload", to: "assets#upload"
end
