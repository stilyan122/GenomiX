using GenomiX.Core.Interfaces;
using GenomiX.Core.Models;
using GenomiX.ViewModels.Disease;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace GenomiX.Core.Services
{
    /// <summary>
    /// Provides short AI-generated educational guidance for possible genetic disease marker matches.
    /// </summary>
    public class AiDiseaseExplanationService : IAiDiseaseExplanationService
    {
        private readonly HttpClient _httpClient;
        private readonly OpenAiOptions _options;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AiDiseaseExplanationService(
            HttpClient httpClient,
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

            var lang = culture?.StartsWith("bg", StringComparison.OrdinalIgnoreCase) == true
                ? "Bulgarian"
                : "English";

            var prompt = $"""
            You are generating an educational explanation for a premium DNA analysis platform called GenomiX.

            Language requirement:
            - The response MUST be written entirely in {lang}.
            - Do NOT mix languages.
            - If the language is Bulgarian, use Cyrillic alphabet only.
            - All content must strictly follow the selected language.

            Context:
            A possible genetic disease marker match was detected.

            Disease: {input.DiseaseName}
            Gene: {input.GeneName}
            Description: {input.Description}
            Matched patterns: {input.MatchedPatterns}
            Total patterns: {input.TotalPatterns}
            Confidence: {Math.Round(input.Confidence * 100)}%

            Core safety rules:
            - This is educational, not diagnostic.
            - Do not claim the user has the disease.
            - Do not prescribe treatment.
            - Do not say "take this medicine" or "stop this medicine".
            - Instead, mention concrete medicines, medicine classes, foods, nutrients, and tests that are commonly relevant to discuss with a qualified doctor.
            - Mention that real interpretation requires clinical testing and consultation with a qualified medical professional.

            UI intent:
            - The output will be shown in a premium medical-style DNA dashboard.
            - It must feel concrete, visual, disease-specific, and easy to understand.
            - Do not return generic disease themes like blood, lung, neuro, or metabolic.
            - Instead, describe the exact biological chain of this specific disease.

            Style requirement:
            - Keep everything concise and information-dense.
            - No storytelling.
            - No filler.
            - Prefer short, specific, high-value phrasing.
            - Each list item should be short and clear.
            - Each visual step should describe one concrete biological event.

            Required fields and limits:
            - shortSummary: max 2 short sentences
            - affectedSystems: exactly 3 items
            - possibleSymptoms: exactly 3 items
            - foodPriorities: exactly 3 items
            - medicinesToDiscussWithDoctor: exactly 3 items
            - helpfulMonitoringIdeas: exactly 3 items
            - visualSteps: exactly 4 steps
            - educationalNotice: max 2 short sentences

            Advice quality rules:
            - Be specific to the disease and gene.
            - Avoid generic phrases like "eat healthy" or "consult a doctor" as standalone advice.
            - For medicinesToDiscussWithDoctor, include concrete medicine names or medicine classes when relevant, but always frame them as discussion points with a doctor.
            - For helpfulMonitoringIdeas, include concrete tests, lab work, follow-up, or measurable indicators.
            - For foodPriorities, include concrete food categories, nutrients, or dietary focus areas.
            - possibleSymptoms should describe what the person may actually feel or notice.
            - affectedSystems should describe the main organs, tissues, or systems involved.

            Visual steps rules:
            - visualSteps must describe the exact disease mechanism step by step.
            - Each step must represent a concrete biological event for this specific disease.
            - The 4 steps should follow a clear chain such as:
              mutation -> abnormal protein / transport / signal -> cell or tissue problem -> symptom or organ effect
            - Do NOT use generic theme words as the main structure.
            - Do NOT return broad categories like "blood theme" or "lung theme".
            - Each step must use one of these kinds only:
              mutation
              abnormal-protein
              misfolded-protein
              blocked-channel
              transport-failure
              cell-deformation
              blocked-flow
              accumulation
              signal-loss
              inflammation
              tissue-damage
              organ-effect
              pain-crisis
              breathing-problem
              infection-risk
              low-oxygen

            For each visual step:
            - title: very short
            - description: 1 short sentence
            - fromLabel: short starting state
            - toLabel: short ending state
            - tags: 1 to 3 short tags

            Examples of good specificity:
            - "пълна кръвна картина"
            - "ретикулоцити"
            - "електрофореза на хемоглобин"
            - "фенилаланин в кръвта"
            - "чернодробни ензими"
            - "храни с фолиева киселина"
            - "добра хидратация"
            - "обсъждане на хидроксиурея"
            - "обсъждане на дорназа алфа"
            - "обсъждане на CFTR модулатори"

            Return JSON with exactly these fields:
            - title
            - shortSummary
            - affectedSystems
            - possibleSymptoms
            - foodPriorities
            - medicinesToDiscussWithDoctor
            - helpfulMonitoringIdeas
            - educationalNotice
            - visualSteps
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
                        name = "disease_popup_minimal",
                        schema = new
                        {
                            type = "object",
                            additionalProperties = false,
                            properties = new
                            {
                                title = new { type = "string" },

                                shortSummary = new { type = "string" },

                                affectedSystems = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },

                                possibleSymptoms = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },

                                foodPriorities = new
                                {
                                    type = "array",
                                    items = new { type = "string" }
                                },

                                medicinesToDiscussWithDoctor = new
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

                                visualSteps = new
                                {
                                    type = "array",
                                    items = new
                                    {
                                        type = "object",
                                        additionalProperties = false,
                                        properties = new
                                        {
                                            kind = new { type = "string" },
                                            title = new { type = "string" },
                                            description = new { type = "string" },
                                            fromLabel = new { type = "string" },
                                            toLabel = new { type = "string" },

                                            tags = new
                                            {
                                                type = "array",
                                                items = new { type = "string" }
                                            }
                                        },
                                        required = new[]
        {
             "kind",
    "title",
    "description",
    "fromLabel",
    "toLabel",
    "tags"
        }
                                    
                            }
                                }
                            },
                            required = new[]
    {
        "title",
        "shortSummary",
        "affectedSystems",
        "possibleSymptoms",
        "foodPriorities",
        "medicinesToDiscussWithDoctor",
        "helpfulMonitoringIdeas",
        "educationalNotice",
        "visualSteps"
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
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

            return result ?? throw new InvalidOperationException("Failed to parse AI explanation JSON.");
        }
    }
}