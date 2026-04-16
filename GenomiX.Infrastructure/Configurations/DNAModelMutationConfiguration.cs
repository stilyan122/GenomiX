using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    public class DNAModelMutationConfiguration : IEntityTypeConfiguration<DNAModelMutation>
    {
        public void Configure(EntityTypeBuilder<DNAModelMutation> builder)
        {
            builder.SeedEntities("models_mutations.json");
        }
    }
}
