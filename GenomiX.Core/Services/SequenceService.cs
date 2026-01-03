using GenomiX.Core.Interfaces;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using Microsoft.EntityFrameworkCore;

namespace GenomiX.Core.Services
{
    public class SequenceService : ISequenceService
    {
        private IRepository<DNASequence> _user_sequence_repository;
        private IRepository<ReferenceSequence> _reference_sequence_repository;

        public SequenceService(
            IRepository<DNASequence> user_sequence_repository,
            IRepository<ReferenceSequence> reference_sequence_repository
            )
        {
            _user_sequence_repository = user_sequence_repository;
            _reference_sequence_repository = reference_sequence_repository;
        }

        public Task AddReferenceSequenceAsync(ReferenceSequence dna)
        {
            throw new NotImplementedException();
        }

        public Task AddUserSequenceAsync(DNASequence dna)
        {
            throw new NotImplementedException();
        }

        public Task DeleteReferenceSequenceAsync(object id)
        {
            throw new NotImplementedException();
        }

        public Task DeleteUserSequenceAsync(object id)
        {
            throw new NotImplementedException();
        }

        public async Task<IEnumerable<ReferenceSequence>> GetAllReferenceSequencesAsync()
        {
            return await this._reference_sequence_repository
                .GetAll()
                .ToListAsync();
        }

        public Task<IEnumerable<DNASequence>> GetAllUserSequencesAsync()
        {
            throw new NotImplementedException();
        }

        public async Task<ReferenceSequence?> GetReferenceSequenceByIdAsync(object id)
        {
            return await _reference_sequence_repository.GetByIdAsync(id);
        }

        public Task<DNASequence?> GetUserSequenceByIdAsync(object id)
        {
            throw new NotImplementedException();
        }

        public Task UpdateReferenceSequenceAsync(ReferenceSequence dna)
        {
            throw new NotImplementedException();
        }

        public Task UpdateUserSequenceAsync(DNASequence dna)
        {
            throw new NotImplementedException();
        }
    }
}
