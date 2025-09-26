using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using GenomiX.Infrastructure.Constants;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> Represents a question belonging to a test, with a prompt and possible answers. </summary>
    [Comment("Question belonging to a Test, with prompt and possible answers.")]
    public class Question
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> FK to Test. </summary>
        [Comment("FK to Test.")]
        [ForeignKey(nameof(Test))]
        public Guid? TestId { get; set; }

        /// <summary> The question text/prompt. </summary>
        [Comment("The question text/prompt.")]
        [Required]
        [MaxLength(QuestionPropertyConstraints.Prompt_MaxLength)]
        public string Prompt { get; set; } = "";

        /// <summary> Optional explanation or hint for the question. </summary>
        [Comment("Optional explanation or hint for the question.")]
        [MaxLength(QuestionPropertyConstraints.Explanation_MaxLength)]
        public string? Explanation { get; set; }

        /// <summary> Navigation property to the parent Test. </summary>
        public Test? Test { get; set; } = null!;

        /// <summary> Navigation property for answers. </summary>
        public ICollection<Answer> Answers { get; set; } = new List<Answer>();
    }
}