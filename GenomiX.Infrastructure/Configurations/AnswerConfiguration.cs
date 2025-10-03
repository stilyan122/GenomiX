using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// Answer: option/value with correctness flag.
    /// - FK: Test (Cascade)
    /// </summary>
    public class AnswerConfiguration : IEntityTypeConfiguration<Answer>
    {
        public void Configure(EntityTypeBuilder<Answer> builder)
        {
            builder.SeedEntities("answers.json");
        }
    }
}
