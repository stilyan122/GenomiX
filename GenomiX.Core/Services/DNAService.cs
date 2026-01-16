using GenomiX.Core.Interfaces;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using Microsoft.EntityFrameworkCore;

namespace GenomiX.Core.Services
{
    /// <summary>
    /// Service for working with user DNA models (DNAModel) via a repository abstraction.
    /// </summary>
    public class DNAService : IDNAService
    {
        private readonly IRepository<DNAModel> _repository;

        /// <summary>
        /// Creates a new DNAService.
        /// </summary>
        /// <param name="repository">Repository for DNAModel entities.</param>
        public DNAService(IRepository<DNAModel> repository)
        {
            _repository = repository;
        }

        /// <inheritdoc />
        public async Task AddAsync(DNAModel dna)
        {
            await _repository.AddAsync(dna);
        }

        /// <inheritdoc />
        public async Task DeleteAsync(object id)
        {
            await _repository.DeleteAsync(id);
        }

        /// <inheritdoc />
        public async Task<IEnumerable<DNAModel>> GetAllAsync()
        {
            return await _repository
                .GetAll()
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<DNAModel?> GetByIdAsync(object id)
        {
            return await _repository.GetByIdAsync(id);
        }

        /// <inheritdoc />
        public async Task UpdateAsync(DNAModel dna)
        {
            await _repository.UpdateAsync(dna);
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<DNAModel>> GetAllForUserAsync(Guid userId)
        {
            return await _repository
               .GetAll()
               .Where(m => m.UserId == userId)
               .Include(m => m.Sequences)
               .OrderByDescending(m => m.UpdatedAt)
               .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<DNAModel?> GetModelForUserWithSequencesAsync(Guid userId, Guid modelId)
        {
            return await _repository
                .GetAll()
                .Where(m => m.UserId == userId && m.Id == modelId)
                .Include(m => m.Sequences)
                .FirstOrDefaultAsync();
        }

        /// <inheritdoc />
        public async Task UpdateModelSequencesAsync(Guid userId, Guid modelId, string s1, string s2)
        {
            var model = await _repository.
                GetAll()
                .Include(m => m.Sequences)
                .FirstOrDefaultAsync(m => m.Id == modelId && m.UserId == userId);

            if (model == null) throw new InvalidOperationException("Model not found.");

            var seq1 = model.Sequences.FirstOrDefault(x => x.Strand == 1);
            var seq2 = model.Sequences.FirstOrDefault(x => x.Strand == 2);

            if (seq1 == null || seq2 == null) throw new InvalidOperationException("Sequences missing.");

            seq1.Sequence = s1;
            seq2.Sequence = s2;

            model.UpdatedAt = DateTimeOffset.UtcNow;

            await _repository.UpdateAsync(model);
        }

        /// <inheritdoc />
        public async Task RenameAsync(Guid userId, Guid modelId, string name)
        {
            var model = await _repository
                .GetAll()
                .FirstOrDefaultAsync(m => m.Id == modelId && m.UserId == userId);

            if (model == null) 
                throw new InvalidOperationException("Model not found.");

            model.Name = name.Trim();
            model.UpdatedAt = DateTimeOffset.UtcNow;

            await _repository.UpdateAsync(model);
        }

        /// <inheritdoc />
        public async Task DeleteForUserAsync(Guid userId, Guid modelId)
        {
            var model = await _repository
                .GetAll()
                .FirstOrDefaultAsync(m => m.Id == modelId && m.UserId == userId);

            if (model == null) 
                throw new InvalidOperationException("Model not found.");

            await _repository.DeleteAsync(modelId);
        }
    }
}
