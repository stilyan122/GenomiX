using Microsoft.EntityFrameworkCore;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> Junction table linking DNA models and diseases (many-to-many). </summary>
    [Comment("Many-to-many link between DNA models and diseases.")]
    [PrimaryKey(nameof(DNA_Model_Id), nameof(DiseaseId))]
    public class DNAModelDisease
    {
        /// <summary> Foreign key for DNA Model. (Half of the PK) </summary>
        [Comment("FK to DNAModel.")]
        public Guid DNA_Model_Id { get; set; }

        /// <summary> Foreign key for Disease. (Half of the PK) </summary>
        [Comment("FK to Disease.")]
        public Guid DiseaseId { get; set; }
    }
}
