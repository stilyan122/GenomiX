using GenomiX.Infrastructure.Validation;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> Immutable snapshot of a DNA sequence (uppercase A/C/G/T only). </summary>
    [Comment("Immutable snapshot of a DNA sequence (A/C/G/T only).")]
    public class DNASequence
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> Owning DNAModel. </summary>
        [Comment("Owning DNAModel (FK).")]
        [ForeignKey(nameof(Model))]
        public Guid ModelId { get; set; }

        /// <summary> Raw DNA string. Uppercase A, C, G, T only (example: "ATGCGT"). </summary>
        [Comment("Raw uppercase DNA string (A,C,G,T only).")]
        [Required]
        [MaxLength(Constants.DNASequencePropertyConstraints.Sequence_MaxLength)]
        [AllowedDnaSequence]
        public string Sequence { get; set; } = "";

        [Comment("Strand index (1 = forward, 2 = complementary).")]
        [Range(Constants.DNASequencePropertyConstraints.Strand_MinLength, 
            Constants.DNASequencePropertyConstraints.Strand_MaxLength)]
        public byte Strand { get; set; } = 1;

        /// <summary> UTC timestamp when this snapshot was created. </summary>
        [Comment("UTC timestamp when the snapshot was created.")]
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary> Navigation Property for DNA Model. </summary>
        public DNAModel Model { get; set; } = null!;
    }
}   
