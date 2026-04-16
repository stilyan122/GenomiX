using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    public class DNAModelDiseaseConfiguration : IEntityTypeConfiguration<DNAModelDisease>
    {
        public void Configure(EntityTypeBuilder<DNAModelDisease> builder)
        {
            builder.SeedEntities("models_diseases.json");
        }
    }
}
