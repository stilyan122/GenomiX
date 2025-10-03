using GenomiX.Core.Interfaces;
using GenomiX.ViewModels.DNA;
using GenomiX.ViewModels.Sequence;
using Microsoft.AspNetCore.Mvc;

namespace GenomiX.Controllers
{
    public class DNAController : Controller
    {
        private IDNAService _DNAService;
        private ISequenceService _sequenceService;

        public DNAController(IDNAService DNAService, ISequenceService sequenceService)
        {
            _DNAService = DNAService;
            _sequenceService = sequenceService;
        }

        public IActionResult Index()
        {
            return View();
        }

        [Route("/dna/choose")]
        public IActionResult Choose()
        {
            //var allDbModels = await _DNAService.GetAllAsync();

            //var allVIewModels = allDbModels.Select(m => new DNAModelViewModel
            //{
            //    Sequences = m.Sequences.Select(s => new SequenceViewModel()
            //    {
            //        Sequence = s.Sequence
            //    }).ToList(),
            //}).ToList();

            //return View(allVIewModels);

            return View();
        }

        [Route("dna/predefined")]
        public async Task<IActionResult> Predefined()
        {
            var predefinedServiceSequences = await this ._sequenceService
                .GetAllReferenceSequencesAsync();

            var sequenceViewModels = predefinedServiceSequences
                .Select(s => new SequenceViewModel()
            {
                Id = s.Id,
                Species = s.Species,
                Sequence = s.Sequence
            }).ToList();

            return View(sequenceViewModels);
        }

        [Route("dna/custom")]
        public IActionResult Custom()
        {
            return View();
        }
    }
}
