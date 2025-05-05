import { useNavigate } from 'react-router-dom';
import PlayerGlobalSearchInput from '../components/PlayerGlobalSearchInput';
import './HomePage.css';
import { motion } from 'framer-motion';

export default function HomePage() {
    const navigate = useNavigate();

    const handleSelectPlayer = (accountId) => {
        navigate(`/players/${accountId}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="home-container"
        >
            <motion.h1
                initial={{ y: -50 }}
                animate={{ y: 0 }}
                className="home-title"
            >
                Пошук гравця
                <div className="title-underline"></div>
            </motion.h1>

            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="search-wrapper"
            >
                <PlayerGlobalSearchInput onSelect={handleSelectPlayer} />
            </motion.div>

            <div className="decorative-elements">
                <div className="gradient-blob"></div>
                <div className="grid-pattern"></div>
            </div>
        </motion.div>
    );
}