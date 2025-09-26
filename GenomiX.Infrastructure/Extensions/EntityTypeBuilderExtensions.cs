using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Newtonsoft.Json;

namespace GenomiX.Common.Extensions
{
    /// <summary>
    /// Creates extensions for the entity type builder.
    /// </summary>
    public static class EntityTypeBuilderExtensions
    {
        public static EntityTypeBuilder SeedEntities<T>(this EntityTypeBuilder<T> entityTypeBuilder, string fileName)
            where T: class
        {
            var workingDirectory = Environment.CurrentDirectory;
            var projectDirectory = Directory.GetParent(workingDirectory);
            var json = File.ReadAllText($"{projectDirectory}/GenomiX.Infrastructure/ConfigurationFiles/{fileName}");

            var sequences = JsonConvert.DeserializeObject<List<T>>(json)
                ?? throw new Exception("Invalid json file path");

            entityTypeBuilder.HasData(sequences);

            return entityTypeBuilder;
        }
    }
}
