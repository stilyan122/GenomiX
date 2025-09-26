using GenomiX.Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GenomiX.Infrastructure.Configurations
{
    /// <summary>
    /// Reference sequence-specific configuration settings
    /// </summary>
    public class ReferenceSequencesConfiguration : IEntityTypeConfiguration<ReferenceSequence>
    {
        public void Configure(EntityTypeBuilder<ReferenceSequence> builder)
        {
            
        }
    }
}
