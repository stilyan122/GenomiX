using GenomiX.Core.Interfaces;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;

namespace GenomiX.Core.Services
{
    public class DNAService : IDNAService
    {
        private IRepository<DNAModel> _repository;

        public DNAService(IRepository<DNAModel> repository)
        {
            _repository = repository;
        }

        public async Task AddAsync(DNAModel dna)
        {
            await this._repository.AddAsync(dna);
        }

        public async Task DeleteAsync(object id)
        {
            await this._repository.DeleteAsync(id);
        }

        public async Task<IEnumerable<DNAModel>> GetAllAsync()
        {
            return this._repository
                .GetAll()
                ;
        }

        public async Task<DNAModel?> GetByIdAsync(object id)
        {
            return await this._repository.GetByIdAsync(id);
        }

        public async Task UpdateAsync(DNAModel dna)
        {
            await this._repository.UpdateAsync(dna);
        }
    }
}
