using GenomiX.Infrastructure.Constants;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> Answer option for a Test, with correctness flag. </summary>
    [Comment("Answer option for a Test, with correctness flag.")]
    public class Answer
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> FK to Question. </summary>
        [Comment("FK to Question.")]
        [ForeignKey(nameof(Question))]
        public Guid? QuestionId { get; set; }

        /// <summary> Answer text/value. </summary>
        [Comment("Answer text/value.")]
        [Required]
        [MaxLength(AnswerPropertyConstraints.Value_MaxLength)]
        public string Value { get; set; } = "";

        /// <summary> Indicates whether the answer is correct. </summary>
        [Comment("Indicates whether the answer is correct.")]
        public bool IsCorrect { get; set; }

        /// <summary> Navigation property to the associated Question entity. </summary>
        public Question? Question { get; set; }
    }
}
