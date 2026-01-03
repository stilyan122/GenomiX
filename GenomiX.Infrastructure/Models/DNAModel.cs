using GenomiX.Infrastructure.Constants;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> A mutable DNA model pointing to two strand snapshots (start/current/last). </summary>
    [Comment("Editable DNA model holding references to two strand snapshots (double-helix).")]
    public class DNAModel
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> User-defined name for this DNA model. </summary>
        [Comment("User-defined name for this DNA model.")]
        [Required]
        [MaxLength(Constants.DNAModelPropertyConstraints.Name_MaxLength)]
        public string Name { get; set; } = "Untitled model";

        /// <summary> Owner user (FK). </summary>
        [Comment("Owner user (FK).")]
        [ForeignKey(nameof(User))]
        public Guid? UserId { get; set; }

        /// <summary> UTC created timestamp. </summary>
        [Comment("UTC created timestamp.")]
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary> UTC updated timestamp. </summary>
        [Comment("UTC updated timestamp.")]
        public DateTimeOffset UpdatedAt { get; set; } 

        /// <summary> Navigation properties. </summary>
        public ICollection<DNAModelMutation> Mutations { get; set; } = new List<DNAModelMutation>();
        public ICollection<DNAModelDisease> DNAModelDiseases { get; set; } = new List<DNAModelDisease>();

        /// <summary> All strand snapshots owned by this model (2). </summary>
        public ICollection<DNASequence> Sequences { get; set; } = new List<DNASequence>();

        /// <summary> Navigation property to the owning user. </summary>
        public GenUser? User { get; set; }
    }
}
