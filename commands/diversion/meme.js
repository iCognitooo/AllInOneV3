const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const fetch = import("node-fetch")
const { colors } = require("../../config.json")


module.exports = {
  data: new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Muestra un meme aleatorio de Reddit")
    .addStringOption((option) =>
      option.setName("subreddit").setDescription("Subreddit específico (sin r/)").setRequired(false),
    ),

  cooldown: 5,

  async execute(interaction) {
    await interaction.deferReply()

    try {
      const subreddit = interaction.options.getString("subreddit") || getRandomMemeSubreddit()
      const meme = await fetchMeme(subreddit)

      if (!meme) {
        return interaction.editReply({
          content: "No pude encontrar un meme. Intenta con otro subreddit.",
          ephemeral: true,
        })
      }

      const embed = new EmbedBuilder()
        .setTitle(meme.title)
        .setURL(`https://reddit.com${meme.permalink}`)
        .setImage(meme.url)
        .setColor(colors.primary)
        .setFooter({
          text: `👍 ${meme.ups} | 💬 ${meme.num_comments} | r/${subreddit}`,
          iconURL: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
        })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error("Error al obtener meme:", error)
      await interaction.editReply({
        content: "Hubo un error al obtener el meme. Inténtalo de nuevo más tarde.",
        ephemeral: true,
      })
    }
  },
}

function getRandomMemeSubreddit() {
  const memeSubreddits = [
    "memes",
    "dankmemes",
    "me_irl",
    "wholesomememes",
    "programmerhumor",
    "AdviceAnimals",
    "MemeEconomy",
    "PrequelMemes",
    "terriblefacebookmemes",
  ]
  return memeSubreddits[Math.floor(Math.random() * memeSubreddits.length)]
}

async function fetchMeme(subreddit) {
  try {
    const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=100`)
    const data = await response.json()

    if (!response.ok || !data.data || !data.data.children || data.data.children.length === 0) {
      return null
    }

    // Filtrar posts que sean imágenes y no NSFW
    const validPosts = data.data.children
      .filter(
        (post) =>
          !post.data.stickied &&
          !post.data.over_18 &&
          post.data.post_hint === "image" &&
          (post.data.url.endsWith(".jpg") ||
            post.data.url.endsWith(".jpeg") ||
            post.data.url.endsWith(".png") ||
            post.data.url.endsWith(".gif")),
      )
      .map((post) => ({
        title: post.data.title,
        url: post.data.url,
        permalink: post.data.permalink,
        ups: post.data.ups,
        num_comments: post.data.num_comments,
      }))

    if (validPosts.length === 0) return null

    // Seleccionar un post aleatorio
    return validPosts[Math.floor(Math.random() * validPosts.length)]
  } catch (error) {
    console.error("Error fetching from Reddit:", error)
    return null
  }
}
