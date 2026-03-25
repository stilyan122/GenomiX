using GenomiX.Core.Interfaces;
using GenomiX.Core.Models;
using GenomiX.ViewModels.Disease;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Options;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace GenomiX.Core.Services
{
    /// <summary>
    /// Provides AI-generated explanations for potential genetic disease markers based on input data.
    /// </summary>
    public class AiDiseaseExplanationService : IAiDiseaseExplanationService
    {
        private readonly HttpClient _httpClient;
        private readonly OpenAiOptions _options;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AiDiseaseExplanationService(HttpClient httpClient, 
            IOptions<OpenAiOptions> options,
            IHttpContextAccessor httpContextAccessor)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<DiseaseAiExplanationDto> ExplainAsync(DiseaseAiExplanationRequestDto input)
        {
            var culture = _httpContextAccessor.HttpContext?
                .Features
                .Get<IRequestCultureFeature>()?
                .RequestCulture
                .UICulture
                .Name;

            var lang = culture?.StartsWith("bg") == true ? "Bulgarian" : "English";

            var prompt = $"""
                You are generating an educational explanation for a premium DNA analysis platform called GenomiX.

                Language requirement:
                - The response MUST be written entirely in {lang}.
                - Do NOT mix languages.
                - If the language is Bulgarian, use Cyrillic alphabet only.
                - All section content must strictly follow the selected language.

                Context:
                A possible genetic disease marker match was detected.

                Disease: {input.DiseaseName}
                Gene: {input.GeneName}
                Description: {input.Description}
                Matched patterns: {input.MatchedPatterns}
                Total patterns: {input.TotalPatterns}
                Confidence: {Math.Round(input.Confidence * 100)}%

                Goal:
                Create a rich, visually meaningful educational explanation suitable for a modern popup interface.

                Rules:
                - This is educational, not diagnostic.
                - Do not claim the user has the disease.
                - Use wording such as "may be associated with" and "could indicate".
                - Do not prescribe treatment.
                - Mention that real interpretation requires clinical testing and consultation with a qualified medical professional.
                - Be specific to the disease and gene.
                - Avoid generic filler text.
                - Do not leave fields empty.
                - possibleSymptoms must contain 3 to 6 items.
                - foodAndLifestyleConsiderations must contain 3 to 6 items.
                - medicationConsiderations must contain 3 to 6 items.
                - helpfulMonitoringIdeas must contain 3 to 6 items.
                - mechanismSteps must contain 4 to 6 short steps.
                - affectedSystems must contain 3 to 6 short items.

                mechanismSteps must explain the biological chain in the body, for example:
                mutation -> protein change -> cell change -> tissue/system effect -> visible consequence

                Return JSON with exactly these fields:
                - title
                - shortSummary
                - biologicalMechanism
                - mechanismSteps
                - affectedSystems
                - whyThisMatters
                - possibleSymptoms
                - foodAndLifestyleConsiderations
                - medicationConsiderations
                - helpfulMonitoringIdeas
                - educationalNotice

                mechanismSteps must be an array of objects with:
                - title
                - description

                - visualMechanism: array of 4–6 steps describing the biological process visually
                Each step must have:
                - type (one of: gene-mutation, protein-change, cell-change, flow-block, accumulation, signal-loss, organ-effect)
                - title
                - description

                - visualTheme: one of:
                blood, lung, neuro, metabolic

                Rules:
                - steps must represent real biological progression
                - do not invent unrealistic biology

                The educational advice must be specific, practical, and disease-related.

                Return concrete but safe guidance.

                For food:
                - include specific food priorities or nutritional directions when appropriate
                - examples may include hydration, protein intake, avoiding excess phenylalanine, iron-related considerations, etc.
                - do not prescribe a medical diet as treatment

                For medicines and substances:
                - do NOT prescribe or forbid medication absolutely
                - instead return medicines, substances, or drug categories that should be discussed with a doctor
                - examples: steroids, dehydration-inducing drugs, sedatives, painkillers, high-risk supplements, or disease-specific medication categories
                - use wording like "may need medical review" or "should be discussed with a qualified clinician"

                Return these additional JSON fields:
                - foodPriorities
                - thingsToAvoidOrDiscuss
                - medicinesToDiscussWithDoctor

                Rules:
                - each of these arrays must contain 3 to 6 concrete items
                - do not leave them empty
                - do not give direct treatment orders
                - keep everything educational and safety-aware
                """;

            var payload = new
            {
                model = _options.Model,
                input = prompt,
                text = new
                {
                    format = new
                    {
                        type = "json_schema",
                        name = "disease_popup",
                        schema = new
                        {
                            type = "object",
                            additionalProperties = false,
                            properties = new
                            {
                                title = new { type = "string" },
                                shortSummary = new { type = "string" },
                                biologicalMechanism = new { type = "string" },
                                mechanismSteps = new
                                {
                                    type = "array",
                                    items = new
                                    {
                                        type = "object",
                                        additionalProperties = false,
                                        properties = new
                                        {
                                            title = new { type = "string" },
                                            description = new { type = "string" }
                                        },
                                        required = new[] { "title", "description" }
                                    }
                                },
                                affectedSystems = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },
                                whyThisMatters = new { type = "string" },
                                possibleSymptoms = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },
                                foodAndLifestyleConsiderations = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },
                                medicationConsiderations = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },
                                helpfulMonitoringIdeas = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },
                                educationalNotice = new { type = "string" },
                                visualMechanism = new
                                {
                                    type = "array",
                                    items = new
                                    {
                                        type = "object",
                                        additionalProperties = false,
                                        properties = new
                                        {
                                            type = new { type = "string" },
                                            title = new { type = "string" },
                                            description = new { type = "string" }
                                        },
                                        required = new[] { "type", "title", "description" }
                                    }
                                },
                                foodPriorities = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },
                                thingsToAvoidOrDiscuss = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },
                                medicinesToDiscussWithDoctor = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },

                                visualTheme = new { type = "string" }
                            },
                            required = new[]
    {
        "title",
        "shortSummary",
        "biologicalMechanism",
        "mechanismSteps",
        "affectedSystems",
        "whyThisMatters",
        "possibleSymptoms",
        "foodAndLifestyleConsiderations",
        "medicationConsiderations",
        "helpfulMonitoringIdeas",
        "educationalNotice",
        "visualMechanism",
        "visualTheme",
        "foodPriorities",
        "thingsToAvoidOrDiscuss",
        "medicinesToDiscussWithDoctor",
    }
                        }
                    }
                }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/responses");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json");

            using var response = await _httpClient.SendAsync(request);
            var raw = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"OpenAI call failed: {response.StatusCode}. {raw}");
            }

            using var doc = JsonDocument.Parse(raw);

            var outputText = doc.RootElement
                .GetProperty("output")[0]
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrWhiteSpace(outputText))
            {
                throw new InvalidOperationException("OpenAI returned empty explanation.");
            }

            var result = JsonSerializer.Deserialize<DiseaseAiExplanationDto>(
                outputText,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return result ?? throw new InvalidOperationException("Failed to parse AI explanation JSON.");
        }
    }
}
