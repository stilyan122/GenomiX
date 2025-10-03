using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Constants;
using GenomiX.Common.Extensions;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// Configures the Question entity for EF Core.
    /// </summary>
    public class QuestionConfiguration : IEntityTypeConfiguration<Question>
    {
        public void Configure(EntityTypeBuilder<Question> builder)
        {
            builder.SeedEntities("questions.json");
        }
    }
}