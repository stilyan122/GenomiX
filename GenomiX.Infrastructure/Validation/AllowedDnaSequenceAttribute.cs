using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using GenomiX.Common;
using GenomiX.Infrastructure.Constants;

namespace GenomiX.Infrastructure.Validation
{
    /// <summary>
    /// Validates that a DNA sequence contains only allowed characters (A, C, G, T).
    /// </summary>
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Field, AllowMultiple = false)]
    public class AllowedDnaSequenceAttribute : ValidationAttribute
    {
        public override bool IsValid(object? value)
        {
            if (value is not string sequence)
                return true; 

            return sequence.All(c => DNASequencePropertyConstraints.Sequence_AllowedCharacters.Contains(c));
        }

        public override string FormatErrorMessage(string name)
        {
            return $"{name} must contain only the following characters: {DNASequencePropertyConstraints.Sequence_AllowedCharacters}";
        }
    }
}