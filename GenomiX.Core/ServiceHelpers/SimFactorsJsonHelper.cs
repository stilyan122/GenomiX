using GenomiX.Core.Models;
using System.Text.Json;

namespace GenomiX.Core.ServiceHelpers
{
    public static class SimFactorsJsonHelper
    {
        public static SimFactors Read(string json)
        => string.IsNullOrWhiteSpace(json)
            ? new SimFactors()
            : (JsonSerializer.Deserialize<SimFactors>(json) ?? new SimFactors());

        public static string Write(SimFactors f)
            => JsonSerializer.Serialize(f, new JsonSerializerOptions { WriteIndented = false });
    }
}
