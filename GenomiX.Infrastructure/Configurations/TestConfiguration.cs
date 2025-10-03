using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// Test: quiz question.
    /// - FK: Lesson (Cascade)
    /// - Type length 10 (mcq|multi|open)
    /// </summary>
    public class TestConfiguration : IEntityTypeConfiguration<Test>
    {
        public void Configure(EntityTypeBuilder<Test> builder)
        {
            builder.SeedEntities("tests.json");
        }
    }
}
