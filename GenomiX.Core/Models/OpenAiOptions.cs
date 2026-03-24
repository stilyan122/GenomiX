namespace GenomiX.Core.Models
{
    public sealed class OpenAiOptions
    {
        public string ApiKey { get; set; } = string.Empty;
        public string Model { get; set; } = "gpt-4.1-mini";
    }
}
