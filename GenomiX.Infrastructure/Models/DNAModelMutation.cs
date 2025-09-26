using GenomiX.Infrastructure.Constants;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> Atomic edit applied to a DNAModel: substitution, insertion, or deletion, recorded with 1-based positions. </summary>
    [Comment("Atomic edit to a DNAModel (substitution|insertion|deletion).")]
    public class DNAModelMutation
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> FK to DNAModel. </summary>
        [Comment("FK to DNAModel.")]
        [ForeignKey(nameof(Model))]
        public Guid? ModelId { get; set; }

        /// <summary> Type of mutation: substitution | insertion | deletion. </summary>
        [Comment("Type of mutation: substitution | insertion | deletion.")]
        [Required]
        [MaxLength(DNAModelMutationPropertyConstraints.Type_MaxLength)]
        public string Type { get; set; } = "";

        /// <summary> 1-based inclusive start position in the strand. </summary>
        [Comment("1-based inclusive start position in the strand.")]
        [Required]
        [Range(DNAModelMutationPropertyConstraints.PosStart_Min, double.MaxValue)]
        public int PosStart { get; set; }

        /// <summary> 1-based inclusive end position in the strand (>= PosStart). </summary>
        [Comment("1-based inclusive end position in the strand (>= PosStart).")]
        [Required]
        [Range(DNAModelMutationPropertyConstraints.PosEnd_Min, double.MaxValue)]
        public int PosEnd { get; set; }

        /// <summary> Reference bases being replaced/removed ('' allowed for insertion). </summary>
        [Comment("Reference bases being replaced/removed ('' allowed for insertion).")]
        [MaxLength(DNAModelMutationPropertyConstraints.Ref_MaxLength)]
        public string Ref { get; set; } = "";

        /// <summary> Alternate bases inserted/replacing ref ('' allowed for deletion). </summary>
        [Comment("Alternate bases inserted/replacing ref ('' allowed for deletion).")]
        [MaxLength(DNAModelMutationPropertyConstraints.Alt_MaxLength)]
        public string Alt { get; set; } = "";

        /// <summary> UTC timestamp of the mutation record. </summary>
        [Comment("UTC timestamp of the mutation record.")]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        /// <summary> Navigation property to the associated DNAModel. </summary>
        public DNAModel? Model { get; set; }
    }
}
