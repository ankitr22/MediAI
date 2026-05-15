import os
from dotenv import load_dotenv

load_dotenv('/app/.env')

PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')
print(f"API Key present: {'Yes' if PINECONE_API_KEY else 'NO - MISSING'}")

from pinecone import Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)

indexes = pc.list_indexes()
index_names = [idx.name for idx in indexes]
print(f"Total indexes: {len(index_names)}")
print(f"Index names: {index_names}")

for idx in indexes:
    print(f"\n--- Index: {idx.name} ---")
    print(f"  Dimension : {idx.dimension}")
    print(f"  Metric    : {idx.metric}")
    try:
        stats = pc.Index(idx.name).describe_index_stats()
        print(f"  Vectors   : {stats.total_vector_count}")
        if stats.namespaces:
            for ns, ns_stats in stats.namespaces.items():
                print(f"  Namespace '{ns}': {ns_stats.vector_count} vectors")
        else:
            print("  Namespace : (default)")
    except Exception as e:
        print(f"  Stats error: {e}")
