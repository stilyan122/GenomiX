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
            var baseDir = AppContext.BaseDirectory;

            var path = Path.Combine(baseDir, "SeedData", fileName);

            if (!File.Exists(path))
            {
                throw new FileNotFoundException(
                    $"Seed file not found: {path}. Make sure it's marked as Content and copied to output.",
                    path);
            }

            var json = File.ReadAllText(path);

            var entities = JsonConvert.DeserializeObject<List<T>>(json)
                           ?? throw new Exception($"Invalid JSON in seed file: {fileName}");

            entityTypeBuilder.HasData(entities);
            return entityTypeBuilder;
        }
    }
}
