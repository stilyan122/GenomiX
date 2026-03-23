using GenomiX.Core.Models;

namespace GenomiX.Core.Interfaces
{
    /// <summary>
    /// Defines the contract for a service that provides scanning functionality.
    /// </summary>
    public interface IScanService
    {
        /// <summary>
        /// Asynchronously scans the specified DNA strands for disease-related sequence matches.
        /// </summary>
        Task<ICollection<DiseaseScanMatchDto>> ScanAsync(string strand1, string strand2);
    }
}
