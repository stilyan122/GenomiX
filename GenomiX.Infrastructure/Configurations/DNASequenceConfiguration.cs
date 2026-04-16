using GenomiX.Common.Extensions;
using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    public class DNASequenceConfiguration : IEntityTypeConfiguration<DNASequence>
    {
        public void Configure(EntityTypeBuilder<DNASequence> builder)
        {
            builder.SeedEntities("sequences.json");
        }
    }
}
