using GenomiX.Infrastructure.Validation;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace GenomiX.Infrastructure.Models
{
    /// <summary>
    /// Immutable reference DNA sequence used as a template (e.g., Human, Mouse, Dog).
    /// These sequences are predefined and not tied to a user or model.
    /// </summary>
    [Comment("Reference DNA sequence template (e.g., Human, Mouse, Dog). Not tied to a user.")]
    public class ReferenceSequence
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> Species or organism identifier (examples: Human, Mouse, Dog). </summary>
        [Comment("Species or organism identifier for the reference sequence (e.g., Human, Mouse, Dog).")]
        [Required]
        [MaxLength(100)]
        public string Species { get; set; } = "";

        /// <summary> Descriptive name (example: "Beta-globin fragment"). </summary>
        [Comment("Descriptive name for the reference sequence (e.g., Beta-globin fragment).")]
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = "";

        /// <summary>
        /// Raw DNA string. Uppercase A, C, G, T only (e.g., "ATGCGT").
        /// </summary>
        [Comment("Raw uppercase DNA string (A,C,G,T only).")]
        [Required]
        [MaxLength(Constants.DNASequencePropertyConstraints.Sequence_MaxLength)]
        [AllowedDnaSequence]
        public string Sequence { get; set; } = "";

        /// <summary> Strand index (1 or 2). </summary>
        [Comment("Strand index of the reference sequence (1 = forward, 2 = complementary).")]
        [Range(1, 2)]
        public byte Strand { get; set; }

        /// <summary> Pair index (groups complementary strands together). </summary>
        [Comment("Pair index groups complementary strands together (e.g., 0 = initial pair).")]
        public int PairIndex { get; set; }

        /// <summary> UTC timestamp when this reference sequence was created. </summary>
        [Comment("UTC timestamp when the reference sequence was created.")]
        public DateTimeOffset CreatedAt { get; set; }
    }
}
