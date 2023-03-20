-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost
-- Généré le : lun. 20 mars 2023 à 19:40
-- Version du serveur : 10.5.18-MariaDB-0+deb11u1
-- Version de PHP : 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `Hotspot`
--

-- --------------------------------------------------------

--
-- Structure de la table `Banned_Devices`
--

CREATE TABLE `Banned_Devices` (
  `MAC_Address` varchar(17) NOT NULL,
  `Reason` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `Registered_Devices`
--

CREATE TABLE `Registered_Devices` (
  `MAC_Address` varchar(17) NOT NULL,
  `First_Name` varchar(50) NOT NULL,
  `Registered_Date` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `Tokens`
--

CREATE TABLE `Tokens` (
  `Token` varchar(50) NOT NULL,
  `Date` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `Banned_Devices`
--
ALTER TABLE `Banned_Devices`
  ADD PRIMARY KEY (`MAC_Address`);

--
-- Index pour la table `Registered_Devices`
--
ALTER TABLE `Registered_Devices`
  ADD PRIMARY KEY (`MAC_Address`);

--
-- Index pour la table `Tokens`
--
ALTER TABLE `Tokens`
  ADD PRIMARY KEY (`Token`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
