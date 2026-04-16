using FluentAssertions;
using GenomiX.Core.Models;
using GenomiX.Core.Services;
using GenomiX.Infrastructure.Models;
using GenomiX.Tests.TestHelpers;
using GenomiX.ViewModels.Disease;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using NUnit.Framework;
using RichardSzalay.MockHttp;
using System.Net;
using System.Text.Json;
using Assert = NUnit.Framework.Assert;

namespace GenomiX.Tests.Services;

[TestFixture]
public class AIDiseaseExplanationServiceTests
{
    private Mock<HttpMessageHandler> _handlerMock;
    private HttpClient _httpClient;
    private Mock<IOptions<OpenAiOptions>> _optionsMock;
    private Mock<IHttpContextAccessor> _httpContextAccessorMock;
    private AiDiseaseExplanationService _sut;

    [SetUp]
    public void SetUp()
    {
        _handlerMock = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_handlerMock.Object);

        _optionsMock = new Mock<IOptions<OpenAiOptions>>();
        _optionsMock.Setup(x => x.Value).Returns(new OpenAiOptions
        {
            ApiKey = "test-key",
            Model = "gpt-4o"
        });

        _httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        _sut = new AiDiseaseExplanationService(_httpClient, _optionsMock.Object, _httpContextAccessorMock.Object);
    }

    [Test]
    public async Task ExplainAsync_SuccessfulResponse_ReturnsDeserializedDto()
    {
        var requestDto = new DiseaseAiExplanationRequestDto
        {
            DiseaseName = "Sickle Cell",
            Confidence = 0.95
        };

        var openAiResponse = new
        {
            output = new[] {
                new {
                    content = new[] {
                        new {
                            text = JsonSerializer.Serialize(new DiseaseAiExplanationDto {
                                Title = "Sickle Cell Explanation",
                                ShortSummary = "A genetic blood disorder."
                            })
                        }
                    }
                }
            }
        };

        SetupHttpMessage(HttpStatusCode.OK, JsonSerializer.Serialize(openAiResponse));

        var result = await _sut.ExplainAsync(requestDto);

        result.Should().NotBeNull();
        result.Title.Should().Be("Sickle Cell Explanation");
        _handlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req => req.Method == HttpMethod.Post),
            ItExpr.IsAny<CancellationToken>()
        );
    }

    [Test]
    public async Task ExplainAsync_WhenCultureIsBulgarian_SetsPromptToBulgarian()
    {
        var requestDto = new DiseaseAiExplanationRequestDto { DiseaseName = "Test" };
        SetupHttpContext("bg-BG");

        var openAiResponse = CreateValidOpenAiResponse(new DiseaseAiExplanationDto { Title = "BG Title" });
        SetupHttpMessage(HttpStatusCode.OK, JsonSerializer.Serialize(openAiResponse));

        string capturedPayload = null;
        _handlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Callback<HttpRequestMessage, CancellationToken>(async (req, token) =>
            {
                capturedPayload = await req.Content.ReadAsStringAsync();
            })
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(openAiResponse))
            });

        await _sut.ExplainAsync(requestDto);

        capturedPayload.Should().Contain("Language requirement:")
                       .And.Contain("The response MUST be written entirely in Bulgarian");
    }

    [Test]
    public void ExplainAsync_ApiReturnsError_ThrowsInvalidOperationException()
    {
        SetupHttpMessage(HttpStatusCode.BadRequest, "Invalid API Key");

        Func<Task> act = async () => await _sut.ExplainAsync(new DiseaseAiExplanationRequestDto());
        act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*OpenAI call failed*");
    }

    [Test]
    public void DiseaseScanMatchDto_ShouldHaveCorrectDefaults()
    {
        var dto = new DiseaseScanMatchDto();

        dto.DiseaseName.Should().BeEmpty();
        dto.MatchedIndex.Should().Be(-1);
        dto.IsMatch.Should().BeFalse();
        dto.DiseaseId.Should().Be(default(Guid));
        dto.Description.Should().BeEmpty();
        dto.GeneName.Should().BeEmpty();
        dto.PatternSequence.Should().BeEmpty();
        dto.Strand.Should().BeEmpty();
    }

    [Test]
    public void DiseaseScanResultDto_ShouldHaveCorrectDefaults()
    {
        var dto = new DiseaseScanResultDto();

        dto.DiseaseId.Should().Be(default(Guid));
        dto.DiseaseName.Should().BeEmpty();
        dto.Description.Should().BeEmpty();
        dto.MatchedPatterns.Should().Be(0);
        dto.TotalPatterns.Should().Be(0);
        dto.Confidence.Should().Be(0.0d);
        dto.Matches.Should().BeEmpty();
    }

    [Test]
    public void DiseaseVisualSimulationStepDto_ShouldHaveCorrectDefaults()
    {
        var dto = new DiseaseVisualMechanismStepDto();

        dto.Type.Should().BeEmpty();
        dto.Title.Should().BeEmpty();
        dto.Description.Should().BeEmpty();
    }

    [Test]
    public void DiseaseVisualStepDto_ListShouldBeInitialized()
    {
        var dto = new DiseaseVisualStepDto();

        dto.Tags.Should().NotBeNull();
        dto.Tags.Should().BeEmpty();
    }

    [Test]
    public void DiseaseDtos_ShouldSerializeAndDeserializeCorrectly()
    {
        var original = new DiseaseVisualStepDto
        {
            Kind = "mutation",
            Title = "Point Mutation",
            Description = "Change in DNA sequence",
            FromLabel = "A",
            ToLabel = "G",
            Tags = new List<string> { "genetic", "variant" }
        };

        var json = JsonSerializer.Serialize(original);
        var deserialized = JsonSerializer.Deserialize<DiseaseVisualStepDto>(json);

        deserialized.Should().BeEquivalentTo(original);
    }
    

    [Test]
    public void ExplainAsync_WhenOpenAiReturnsEmptyText_ThrowsInvalidOperationException()
    {
        var mockHttp = new MockHttpMessageHandler();
        var options = Options.Create(new OpenAiOptions { ApiKey = "key" });
        var mockAccessor = new Mock<IHttpContextAccessor>();

        var emptyJsonResponse = JsonSerializer.Serialize(new
        {
            output = new[] { new { content = new[] { new { text = "" } } } }
        });

        mockHttp.When("https://api.openai.com/v1/responses")
                .Respond("application/json", emptyJsonResponse);

        var sut = new AiDiseaseExplanationService(mockHttp.ToHttpClient(), options, mockAccessor.Object);
        var ex = Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await sut.ExplainAsync(new DiseaseAiExplanationRequestDto()));

        Assert.That(ex.Message, Is.EqualTo("OpenAI returned empty explanation."));
    }

    [Test]
    public void ExplainAsync_WhenJsonIsInvalidForDto_ThrowsException()
    {
        var mockHttp = new MockHttpMessageHandler();
        var options = Options.Create(new OpenAiOptions { ApiKey = "key" });
        var mockAccessor = new Mock<IHttpContextAccessor>();

        var invalidDtoResponse = JsonSerializer.Serialize(new
        {
            output = new[] { new { content = new[] { new { text = "null" } } } }
        });

        mockHttp.When("https://api.openai.com/v1/responses")
                .Respond("application/json", invalidDtoResponse);

        var sut = new AiDiseaseExplanationService(mockHttp.ToHttpClient(), options, mockAccessor.Object);
        Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await sut.ExplainAsync(new DiseaseAiExplanationRequestDto()));
    }

    private void SetupHttpMessage(HttpStatusCode code, string content)
    {
        _handlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = code,
                Content = new StringContent(content)
            });
    }

    private void SetupHttpContext(string cultureName)
    {
        var culture = new System.Globalization.CultureInfo(cultureName);
        var requestCulture = new RequestCulture(culture, culture);

        var feature = new RequestCultureFeature(requestCulture, null);

        var featureCollection = new FeatureCollection();
        featureCollection.Set<IRequestCultureFeature>(feature);

        var context = new DefaultHttpContext(featureCollection); 

        _httpContextAccessorMock.Setup(x => x.HttpContext).Returns(context);
    }

    private object CreateValidOpenAiResponse(DiseaseAiExplanationDto dto)
    {
        return new
        {
            output = new[] {
                new {
                    content = new[] {
                        new { text = JsonSerializer.Serialize(dto) }
                    }
                }
            }
        };
    }
}
