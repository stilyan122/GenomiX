using GenomiX.Core.Interfaces;
using GenomiX.ViewModels.DNA;
using GenomiX.ViewModels.Sequence;
using Microsoft.AspNetCore.Mvc;

namespace GenomiX.Controllers
{
    public class DNAController : Controller
    {
        private IDNAService _DNAService;

        public DNAController(IDNAService DNAService)
        {
            _DNAService = DNAService;
        }

        public IActionResult Index()
        {
            return View();
        }

        [Route("/dna/choose")]
        public async Task<IActionResult> DNAModel()
        {
            var allDbModels = await _DNAService.GetAllAsync();

            var allVIewModels = allDbModels.Select(m => new DNAModelViewModel
            {
                Sequences = m.Sequences.Select(s => new SequenceViewModel()
                {
                    Sequence = s.Sequence
                }).ToList(),
            }).ToList();

            return View(allVIewModels);
        }
    }
}
