# frozen_string_literal: true

class CvGeneratorsController < ApplicationController
  before_action :set_cv_candidate, only: [ :show, :edit, :update, :destroy ]
  before_action :set_example, only: [ :new, :create, :generate ]

  def index
    @cv_candidates = CvCandidate.all
    @examples = Example.all
  end

  def new
    @cv_candidate = CvCandidate.new
  end

  def create
    @cv_candidate = CvCandidate.new(cv_candidate_params)

    if @cv_candidate.save
      redirect_to cv_generator_path(@cv_candidate), notice: "Candidate was successfully created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    @examples = Example.all
    @cv_generations = @cv_candidate.cv_generations.includes(:example)
  end

  def generate
    @cv_candidate = CvCandidate.find(params[:id])

    begin
      # Check if generation already exists for this template and candidate
      existing_generation = CvGeneration.find_by(
        example: @example,
        cv_candidate: @cv_candidate
      )

      if existing_generation
        @cv_generation = existing_generation
      else
        # Create new generation
        renderer = TemplateRenderer.new(@example.html, @cv_candidate.structured_data)
        rendered_html = renderer.render

        @cv_generation = CvGeneration.create!(
          example: @example,
          cv_candidate: @cv_candidate,
          generated_html: rendered_html,
          generated_css: @example.css
        )
      end

      respond_to do |format|
        format.html { redirect_to cv_generator_path(@cv_candidate), notice: "Resume was successfully generated!" }
        format.json { render json: {
          html: @cv_generation.full_html,
          success: true,
          generation_id: @cv_generation.id,
          edit_url: edit_content_cv_generation_path(@cv_generation)
        } }
      end
    rescue => e
      Rails.logger.error "Generation error: #{e.message}"
      respond_to do |format|
        format.html { redirect_to cv_generator_path(@cv_candidate), alert: "Generation error: #{e.message}" }
        format.json { render json: { success: false, error: e.message }, status: :unprocessable_entity }
      end
    end
  end

  def edit
  end

  def update
    if @cv_candidate.update(cv_candidate_params)
      redirect_to cv_generator_path(@cv_candidate), notice: "Candidate data was successfully updated."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @cv_candidate.destroy
    redirect_to cv_generators_path, notice: "Candidate was successfully deleted."
  end

  private

  def set_cv_candidate
    @cv_candidate = CvCandidate.find(params[:id])
  end

  def set_example
    @example = Example.find(params[:example_id]) if params[:example_id]
  end

  def cv_candidate_params
    permitted_params = params.require(:cv_candidate).permit(:name, :original_resume, :structured_data)

    # Parse JSON string to Hash if it's a string
    if permitted_params[:structured_data].is_a?(String)
      begin
        permitted_params[:structured_data] = JSON.parse(permitted_params[:structured_data])
      rescue JSON::ParserError => e
        # If JSON is invalid, leave as is - validation will catch the error
      end
    end

    permitted_params
  end
end
