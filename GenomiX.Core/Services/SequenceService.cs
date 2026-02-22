using GenomiX.Core.Interfaces;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using Microsoft.EntityFrameworkCore;

namespace GenomiX.Core.Services
{
    public class SequenceService : ISequenceService
    {
        private readonly IRepository<DNASequence> _userSequenceRepo;
        private readonly IRepository<ReferenceSequence> _referenceSequenceRepo;

        public SequenceService(
            IRepository<DNASequence> userSequenceRepo,
            IRepository<ReferenceSequence> referenceSequenceRepo)
        {
            _userSequenceRepo = userSequenceRepo;
            _referenceSequenceRepo = referenceSequenceRepo;
        }

        public async Task<IReadOnlyList<ReferenceSequence>> GetApprovedAsync()
        {
            return await _referenceSequenceRepo.GetAll()
                .Include(rs => rs.CreatedByUser)
                .Where(x => x.IsApproved && !x.IsRejected)
                .OrderByDescending(x => x.ApprovedAt ?? x.CreatedAt)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<ReferenceSequence>> GetPendingAsync()
        {
            return await _referenceSequenceRepo.GetAll()
                .Include(rs => rs.CreatedByUser)
                .Where(x => !x.IsApproved && !x.IsRejected)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<ReferenceSequence>> GetRejectedAsync()
        {
            return await _referenceSequenceRepo.GetAll()
                .Include(rs => rs.CreatedByUser)
                .Where(x => x.IsRejected && !x.IsApproved)
                .OrderByDescending(x => x.RejectedAt ?? x.CreatedAt)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<ReferenceSequence>> GetMineAsync(Guid userId)
        {
            return await _referenceSequenceRepo.GetAll()
                .Include(rs => rs.CreatedByUser)
                .Where(x => x.CreatedByUserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<ReferenceSequence>> GetPendingMineAsync(Guid userId)
        {
            return await _referenceSequenceRepo.GetAll()
                .Include(rs => rs.CreatedByUser)
                .Where(x => x.CreatedByUserId == userId && !x.IsApproved && !x.IsRejected)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public async Task<Guid> CreateReferenceAsync(Guid userId, string species, string name, string sequence)
        {
            var now = DateTimeOffset.UtcNow;

            var entity = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = userId,
                Species = (species ?? "").Trim(),
                Name = (name ?? "").Trim(),
                Sequence = (sequence ?? "").Trim().ToUpperInvariant(),
                CreatedAt = now,
                UpdatedAt = now,
                IsApproved = false,
                IsRejected = false,
                RejectionReason = null,
                ApprovedAt = null,
                RejectedAt = null
            };

            await _referenceSequenceRepo.AddAsync(entity);
            return entity.Id;
        }

        public async Task<bool> UpdateReferenceAsync(Guid userId, Guid id, string species, string name, string sequence)
        {
            var entity = await _referenceSequenceRepo.GetAll().FirstOrDefaultAsync(x => x.Id == id);
           
            if (entity == null) 
                return false;

            if (entity.CreatedByUserId != userId) 
                return false;

            if (entity.IsApproved) 
                return false;

            entity.Species = (species ?? "").Trim();
            entity.Name = (name ?? "").Trim();
            entity.Sequence = (sequence ?? "").Trim().ToUpperInvariant();
            entity.UpdatedAt = DateTimeOffset.UtcNow;

            entity.IsRejected = false;
            entity.RejectionReason = null;
            entity.RejectedAt = null;

            await _referenceSequenceRepo.UpdateAsync(entity);
            return true;
        }

        public async Task<bool> DeleteReferenceAsync(Guid userId, Guid id)
        {
            var entity = await _referenceSequenceRepo.GetAll().FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return false;

            if (entity.CreatedByUserId != userId) return false;

            if (entity.IsApproved) return false;

            await _referenceSequenceRepo.DeleteAsync(id);
            return true;
        }

        public async Task<bool> ApproveReferenceAsync(Guid id)
        {
            var entity = await _referenceSequenceRepo.GetAll().FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return false;

            if (entity.IsApproved) return true;

            entity.IsApproved = true;
            entity.IsRejected = false;
            entity.RejectionReason = null;
            entity.ApprovedAt = DateTimeOffset.UtcNow;
            entity.RejectedAt = null;
            entity.UpdatedAt = DateTimeOffset.UtcNow;

            await _referenceSequenceRepo.UpdateAsync(entity);
            return true;
        }

        public async Task<bool> RejectReferenceAsync(Guid id, string reason)
        {
            var entity = await _referenceSequenceRepo.GetAll().FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return false;

            if (entity.IsApproved) return false;

            entity.IsRejected = true;
            entity.IsApproved = false;
            entity.RejectionReason = (reason ?? "").Trim();
            entity.RejectedAt = DateTimeOffset.UtcNow;
            entity.ApprovedAt = null;
            entity.UpdatedAt = DateTimeOffset.UtcNow;

            await _referenceSequenceRepo.UpdateAsync(entity);
            return true;
        }

        public async Task<ReferenceSequence?> GetReferenceSequenceByIdAsync(object id)
        {
            return await _referenceSequenceRepo
                .GetAll()
                .Include(rs => rs.CreatedByUser)
                .FirstOrDefaultAsync(x => x.Id.Equals(id));
        }

        public async Task AddUserSequenceAsync(DNASequence dna)
        {
            dna.Sequence = Normalize(dna.Sequence);
            Validate(dna.Sequence);

            await _userSequenceRepo.AddAsync(dna);
        }

        public async Task UpdateUserSequenceAsync(DNASequence dna)
        {
            var existing = await _userSequenceRepo.GetByIdAsync(dna.Id);
            if (existing == null)
                throw new ArgumentException("User sequence not found.");

            dna.Sequence = Normalize(dna.Sequence);
            Validate(dna.Sequence);

            existing.Sequence = dna.Sequence;

            await _userSequenceRepo.UpdateAsync(existing);
        }

        public async Task DeleteUserSequenceAsync(object id)
        {
            var entity = await _userSequenceRepo.GetByIdAsync(id);
            if (entity == null)
                return;

            await _userSequenceRepo.DeleteAsync(id);
        }

        public async Task<IEnumerable<DNASequence>> GetAllUserSequencesAsync()
        {
            return await _userSequenceRepo
                .GetAll()
                .ToListAsync();
        }

        public async Task<DNASequence?> GetUserSequenceByIdAsync(object id)
        {
            return await _userSequenceRepo.GetByIdAsync(id);
        }

        private static string Normalize(string s)
        {
            return new string(
                (s ?? "")
                .Trim()
                .ToUpperInvariant()
                .Where(c => !char.IsWhiteSpace(c))
                .ToArray()
            );
        }

        private static void Validate(string sequence)
        {
            if (string.IsNullOrWhiteSpace(sequence))
                throw new ArgumentException("Sequence cannot be empty.");

            bool valid = sequence.All(c => c is 'A' or 'C' or 'G' or 'T');

            if (!valid)
                throw new ArgumentException("Invalid DNA bases. Allowed: A, C, G, T.");
        }
    }
}