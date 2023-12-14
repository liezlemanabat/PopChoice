import { openai, supabase } from './config.js';
import moviesArr from './content.js';

const movieForm = document.getElementById('movie-form');
const favoriteMovie = document.getElementById('favorite-movie');
const movieMood = document.getElementById('movie-mood');
const moviePreference = document.getElementById('movie-preference');
const movieReco = document.getElementById('movie-reco')
const loader = document.getElementById('loader-container')
const homepage = document.getElementById('homepage')
const backBtn = document.getElementById('back-to-main')
const answerPage = document.getElementById('answer-container')
const stars = document.getElementById('stars')
const movieTitle = document.getElementById('movie-title')
const yearReleased = document.getElementById('released-year')

movieForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const moviePreferencesArr = [favoriteMovie.value, movieMood.value, moviePreference.value].join(', ')
    
    if(moviePreferencesArr){
        loader.style.display = 'block'
        homepage.classList.add('hidden')
        
        await main(moviePreferencesArr);
        
        answerPage.classList.add('show')
        loader.style.display = 'none'
        
        favoriteMovie.value = '';
        movieMood.value = '';
        moviePreference.value = '';
    }

});

backBtn.addEventListener('click', () => {
        homepage.classList.remove('hidden')
        answerPage.classList.remove('show')
})

const storeMoviesArr = async (data) => {
  const embeddingsData = await Promise.all(
    data.map(async (movie) => {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: movie.content
      });
      return {
        content: movie.content, // Using title as content for simplicity
        embedding: embeddingResponse.data[0].embedding,
      };
    })
  );
};

async function main(moviePreferencesArr) {
    try {
        const embedding = await createEmbedding(moviePreferencesArr)       
        const match = await findNearestMatch(embedding)
        console.log('Match', match)
        await fetchTitle(match)
        await fetchStars(match)
        await fetchYearReleased(match)
        await getChatCompletion(match, moviePreferencesArr)  
    } catch (error) {
        console.error('Error in main function.', error.message)
    }
}

async function createEmbedding(moviePreferencesArr) {
    try {
        // Create embedding for the joined text
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: moviePreferencesArr,
        });
        // Extract and return the embedding
        const embedding = embeddingResponse.data[0].embedding;
        return embedding; 
    } catch (error) {
        console.error('Error in createEmbedding function.', error.message);
        throw error;
    }
}

async function findNearestMatch(embedding) {
    try {      
        const { data, error } = await supabase.rpc('match_movies', {
            query_embedding: embedding,
            match_threshold: 0.50,
            match_count: 1
        });
        const match = data.map(obj => obj.content).join('\n');
        console.log('Match', match)
        return match
    } catch (error) {
        console.error('Error in findNearestMatch function.', error.message);
        throw error;
    }
}

async function fetchTitle(movie){
     const message = [{
         role: 'system',
         content: `extract the title from Context. Only provide the title of the movie nothing more.`
     },{
         role: 'user',
         content: `Context: ${movie}  title: `
     }]
     const { choices }= await openai.chat.completions.create({
         model: 'gpt-3.5-turbo-1106',
         messages: message,
         temperature: 0.50,
         frequency_penalty: 0.50
    })
    const title = choices[0].message.content
    console.log('Title: ', title)
    movieTitle.innerText = title
 }
 
 async function fetchYearReleased(movie){
     const message = [{
         role: 'system',
         content: `extract movie yearReleased from the Context. Only provide the Year of the movie nothing more.`
     },{
         role: 'user',
         content: `Context: ${movie} yearReleased: `
     }]
     const { choices }= await openai.chat.completions.create({
         model: 'gpt-3.5-turbo-1106',
         messages: message,
         temperature: 0.50,
         frequency_penalty: 0.50
    })
    const movieReleased = choices[0].message.content
    console.log('Year: ', movieReleased)
    yearReleased.innerText = movieReleased
 }
 
 async function fetchStars(movie){
     const message = [{
         role: 'system',
         content: `extract the starring actors from the Context. Only provide the starring actor names of the movie nothing more.`
     },{
         role: 'user',
         content: `Context: ${movie} Starring actors: `
     }]
     const { choices }= await openai.chat.completions.create({
         model: 'gpt-3.5-turbo-1106',
         messages: message,
         temperature: 0.50,
         frequency_penalty: 0.50
    })
    const starringStar = choices[0].message.content
    console.log('Actors: ', starringStar)
    stars.innerText = starringStar
 }
 
 async function getChatCompletion(text, query) {
    const chatMessages = [
        {
        role: 'system',
        content: `You are an enthusiastic movie expert who loves recommending movies to people. You will be given two pieces of information - some context about movies and a question. Your main job is to formulate a short answer to the question using the provided context. If you are unsure and cannot find the answer in the context, say, "Sorry, I don't know the answer." Please do not make up the answer.`
        },
        {
        role: 'user',
        content: `Context: ${text} Question: ${query}`
    }]
    
    const { choices } = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: chatMessages,
        temperature: 0.65,
        frequency_penalty: 0.50
    })
    const movieSuggestion = choices[0].message.content
    console.log('ChatResponse:', movieSuggestion )
    movieReco.innerText = movieSuggestion
}
