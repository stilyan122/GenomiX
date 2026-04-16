using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    public class DNAModelConfiguration : IEntityTypeConfiguration<DNAModel>
    {
        public void Configure(EntityTypeBuilder<DNAModel> builder)
        {
            builder.SeedEntities("models.json");
        }
    }
}
